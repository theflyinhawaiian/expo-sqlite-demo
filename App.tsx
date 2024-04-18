import { useState, useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Constants from "expo-constants";
import * as SQLite from "expo-sqlite";

function isStringArray(x: any){
  return Array.isArray(x) && typeof x[0] === "string"
}

const db = SQLite.openDatabase("db.db");

interface Item {
  id: number,
  done: boolean,
  value: string,
}

function Items({ done: doneHeading, onPressItem } : { done: boolean, onPressItem: (x : number) => void }) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const loadData = async () => {
      await db.transactionAsync(async (tx) => {
        let result = await tx.executeSqlAsync(
          `select * from items where done = ?;`,
          [doneHeading ? 1 : 0]
        );
        if(!('_array' in result.rows))
          return;

        if(!Array.isArray(result.rows._array) || !isStringArray(result.rows._array))
          return;

        setItems(result.rows._array);
      });
    }
    loadData();
  }, []);

  const heading = doneHeading ? "Completed" : "Todo";

  if (items === null || items.length === 0) {
    return null;
  }


  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {items.map(({ id, done, value }) => (
        <TouchableOpacity
          key={id}
          onPress={() => onPressItem && onPressItem(id)}
          style={{
            backgroundColor: done ? "#1c9963" : "#fff",
            borderColor: "#000",
            borderWidth: 1,
            padding: 8,
          }}
        >
          <Text style={{ color: done ? "#fff" : "#000" }}>{value}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function App() {
  const [text, setText] = useState<string>("");
  const [forceUpdateId, forceUpdate] = useForceUpdate();


  useEffect(() => {
    const initTables = async () => {
      await db.transactionAsync(async (tx) => {
        await tx.executeSqlAsync(
          "create table if not exists items (id integer primary key not null, done int, value text);"
        );
      });
    }
    initTables();
  }, []);

  const add = async (text : string) => {
    console.log("adding: " + text);
    // is text empty?
    if (text === null || text === "") {
      return false;
    }

    await db.transactionAsync(
      async (tx) => {
        console.log("beginning add transaction");
        await tx.executeSqlAsync("insert into items (done, value) values (0, ?)", [text]);
        let result = await tx.executeSqlAsync("select * from items", []);
        console.log(JSON.stringify(result.rows))
        forceUpdate();
      }, false
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>SQLite Example</Text>

      {Platform.OS === "web" ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={styles.heading}>
            Expo SQlite is not supported on web!
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.flexRow}>
            <TextInput
              onChangeText={(text) => setText(text)}
              onSubmitEditing={() => {
                add(text);
                setText("");
              }}
              placeholder="what do you need to do?"
              style={styles.input}
              value={text}
            />
          </View>
          <ScrollView style={styles.listArea}>
            <Items
              key={`forceupdate-todo-${forceUpdateId}`}
              done={false}
              onPressItem={(taskId) => {
                  async function completeTask(id : number){
                    await db.transactionAsync(
                      async (tx) => {
                        await tx.executeSqlAsync(`update items set done = 1 where id = ?;`, [
                          id,
                        ]);
                        forceUpdate();
                      }
                    );
                  }
                  completeTask(taskId);
                }
              }
            />
            <Items
              done
              key={`forceupdate-done-${forceUpdateId}`}
              onPressItem={(id) => {
                  async function removeTask(taskId : number){
                    await db.transactionAsync(
                      async (tx) => {
                        await tx.executeSqlAsync(`delete from items where id = ?;`, [taskId]);
                        forceUpdate();
                      }
                    )
                  }
                  removeTask(id);
                }
              } 
            />
          </ScrollView>
        </>
      )}
    </View>
  );
}

function useForceUpdate() : [number, () => void] {
  const [value, setValue] = useState(0);
  return [value, () => setValue(value + 1)];
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flex: 1,
    paddingTop: Constants.statusBarHeight,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  flexRow: {
    flexDirection: "row",
  },
  input: {
    borderColor: "#4630eb",
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    height: 48,
    margin: 16,
    padding: 8,
  },
  listArea: {
    backgroundColor: "#f0f0f0",
    flex: 1,
    paddingTop: 16,
  },
  sectionContainer: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 18,
    marginBottom: 8,
  },
});
