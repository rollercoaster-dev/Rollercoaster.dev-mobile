import React, { useEffect, useState, useRef } from "react";
import { registerRootComponent } from "expo";
import {
  View,
  Text,
  Button,
  ScrollView,
  TextInput,
  Image,
  Linking,
} from "react-native";
import { Worklet } from "react-native-bare-kit";
import b4a from "b4a";
import { File, Paths } from "expo-file-system";
import { useAudioPlayer } from "expo-audio";
import bundle from "./backend.bundle.js";
function App() {
  const [status, setStatus] = useState("Starting test runtime"),
    [invite, setInvite] = useState(""),
    [files, setFiles] = useState([]),
    [audio, setAudio] = useState(null);
  const worklet = useRef(null);
  const player = useAudioPlayer(audio);
  const send = (c) =>
    worklet.current?.IPC.write(b4a.from(JSON.stringify(c) + "\n"));
  useEffect(() => {
    const w = new Worklet();
    worklet.current = w;
    let text = "";
    w.IPC.on("data", (bytes) => {
      text += b4a.toString(bytes);
      let i;
      while ((i = text.indexOf("\n")) >= 0) {
        const raw = text.slice(0, i);
        text = text.slice(i + 1);
        try {
          const e = JSON.parse(raw);
          if (e.status) setStatus(e.status);
          if (e.error) setStatus("ERROR: " + e.error);
          if (e.invite) {
            setInvite(e.invite);
            console.log("PEER_SPIKE_INVITE " + e.invite);
          }
          if (e.files) {
            setFiles(e.files);
            const sound = e.files.find((f) => f.mime === "audio/wav");
            if (sound) {
              const f = new File(Paths.cache, "peer-tone.wav");
              f.write(b4a.from(sound.data, "base64"));
              setAudio(f.uri);
            }
          }
          console.log(
            "PEER_SPIKE_EVENT " +
              JSON.stringify({
                ...e,
                files: e.files?.map((f) => ({ name: f.name, mime: f.mime })),
              }),
          );
        } catch (e) {
          setStatus(String(e));
        }
      }
    });
    w.start("/backend.bundle", bundle);
    const open = (url) => {
      if (!url) return;
      if (url.includes("://host")) send({ action: "host" });
      else if (url.includes("://join")) {
        const value = new URL(url).searchParams.get("invite");
        setInvite(value || "");
        send({ action: "join", invite: value });
      }
    };
    Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener("url", (e) => open(e.url));
    return () => {
      sub.remove();
      w.terminate?.();
    };
  }, []);
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 24,
        paddingTop: 70,
        gap: 18,
        backgroundColor: "#fff",
        flexGrow: 1,
      }}
    >
      <Text style={{ fontSize: 26, fontWeight: "bold" }}>
        Peer evidence spike
      </Text>
      <Text>
        Temporary transport test. Synthetic evidence and pre-signed credential
        fixtures; this does not issue a real peer validation.
      </Text>
      <Text selectable style={{ fontSize: 18 }}>
        {status}
      </Text>
      <Button
        title="Host evidence on this device"
        onPress={() => send({ action: "host" })}
      />
      <TextInput
        accessibilityLabel="Peer invitation"
        value={invite}
        onChangeText={setInvite}
        multiline
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 12, minHeight: 70 }}
      />
      <Button
        title="Connect to invitation"
        onPress={() => send({ action: "join", invite })}
      />
      {files.map((f) => (
        <View key={f.name}>
          <Text>{f.name}</Text>
          {f.mime === "image/png" && (
            <Image
              accessibilityLabel="Received test image"
              source={{ uri: "data:image/png;base64," + f.data }}
              style={{ height: 180, width: 180 }}
            />
          )}
        </View>
      ))}
      {audio && (
        <Button
          title="Play received test audio"
          onPress={() => {
            player.seekTo(0);
            player.play();
          }}
        />
      )}
      {files.length > 0 && (
        <Button
          title="Return signed endorsement fixture"
          onPress={() => send({ action: "return" })}
        />
      )}
    </ScrollView>
  );
}
registerRootComponent(App);
