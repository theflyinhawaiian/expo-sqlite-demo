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
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from "expo-sqlite/next";

function isStringArray(x: any){
  return Array.isArray(x) && typeof x[0] === "string"
}

interface Item {
  id: number,
  done: boolean,
  value: string,
}

export default function App(){
  return (
    <View style={styles.container}>
      <SQLiteProvider databaseName="db.db" onInit={migrateDbIfNeeded}>
        <Content />
      </SQLiteProvider>
    </View>
    );
}

function Items({ done: doneHeading, onPressItem } : { done: boolean, onPressItem: (x : number) => void }) {
  const db = useSQLiteContext();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const result = await db.getAllAsync<Item>(`select * from items where done = ?;`, [doneHeading ? 1 : 0]);
      setItems(result);
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

function Content(){
  const db = useSQLiteContext();
  const [text, setText] = useState<string>("");
  const [forceUpdateId, forceUpdate] = useForceUpdate();


  const add = async (text : string) => {
    console.log("adding: " + text);
    // is text empty?
    if (text === null || text === "") {
      return false;
    }

    await db.runAsync("insert into items (done, value) values (0, ?)", [text]);
    forceUpdate();
  };

  return (
    <>
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
                    await db.runAsync(`update items set done = 1 where id = ?;`, [id]);
                    forceUpdate();
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
                    await db.runAsync(`delete from items where id = ?;`, [taskId]);
                    forceUpdate();
                  }
                  
                  removeTask(id);
                }
              } 
            />
          </ScrollView>
        </>
      )}
    </>
  );
}

function useForceUpdate() : [number, () => void] {
  const [value, setValue] = useState(0);
  return [value, () => setValue(value + 1)];
}

async function migrateDbIfNeeded(db: SQLiteDatabase){
  await db.execAsync("create table if not exists items (id integer primary key not null, done int, value text);");
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
