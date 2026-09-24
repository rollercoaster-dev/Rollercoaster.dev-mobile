// THROWAWAY transport/evidence spike. No product policy is defined here.
const DHT = require("hyperdht");
const os = require("bare-os");
const sodium = require("sodium-universal");
const b4a = require("b4a");
const fixture = require("./fixture.json");
const endorsement = require("./endorsement.json");
const { IPC } = BareKit;
const nodes = [];
let control = "",
  peer,
  started = false;
const emit = (data) => IPC.write(b4a.from(JSON.stringify(data) + "\n"));
const hash = (bytes) => {
  const out = b4a.alloc(32);
  sodium.crypto_hash_sha256(out, bytes);
  return b4a.toString(out, "hex");
};
function bind(socket, receiver) {
  peer = socket;
  let parts = [],
    total = 0,
    completed = false;
  socket.on("error", (e) => emit({ error: e.message }));
  socket.on("end", () => {
    if (!completed)
      emit({ error: "Transfer ended before a complete message arrived" });
  });
  socket.on("data", (data) => {
    total += data.length;
    if (total > 16 * 1024 * 1024) {
      socket.destroy();
      emit({ error: "Test size limit exceeded" });
      return;
    }
    parts.push(data);
    if (data[data.length - 1] !== 10) return;
    try {
      const message = JSON.parse(b4a.toString(b4a.concat(parts)));
      parts = [];
      total = 0;
      completed = true;
      if (receiver) {
        if (
          !Array.isArray(message.files) ||
          message.files.length !== fixture.files.length
        )
          throw Error("Missing or extra evidence files");
        for (let i = 0; i < message.files.length; i++) {
          if (
            message.files[i].name !== fixture.files[i].name ||
            hash(b4a.from(message.files[i].data, "base64")) !==
              hash(b4a.from(fixture.files[i].data, "base64"))
          )
            throw Error("Evidence differs from signed test fixture");
        }
        if (message.credential !== fixture.credential)
          throw Error("Credential differs from signed test fixture");
        emit({
          status: "Evidence received and matched the signed fixture",
          files: message.files,
          credential: message.credential,
        });
      } else {
        if (message.endorsement !== endorsement.endorsement)
          throw Error("Response differs from signed test fixture");
        emit({
          status: "Returned endorsement fixture received intact",
          complete: true,
        });
      }
    } catch (e) {
      emit({ error: e.message });
    }
  });
}
async function host() {
  const ifaces = os.networkInterfaces();
  const list = Object.entries(ifaces).flatMap(([name, items]) =>
    items.map((x) => ({ ...x, name })),
  );
  const ip =
    list.find(
      (x) => !x.internal && x.family === "IPv4" && /^(en0|wlan0)$/.test(x.name),
    ) || list.find((x) => !x.internal && x.family === "IPv4");
  if (!ip) throw Error("Connect to Wi-Fi first");
  const address = ip.address;
  let bootstrap = [];
  for (let i = 0; i < 3; i++) {
    const n = new DHT({
      bootstrap: [...bootstrap],
      host: "0.0.0.0",
      ephemeral: false,
      firewalled: false,
    });
    nodes.push(n);
    await n.fullyBootstrapped();
    if (!i) bootstrap = [{ host: address, port: n.address().port }];
  }
  const n = new DHT({ bootstrap, host: "0.0.0.0" });
  nodes.push(n);
  await n.fullyBootstrapped();
  const server = n.createServer((s) => {
    bind(s, false);
    s.write(b4a.from(JSON.stringify(fixture) + "\n"));
    emit({ status: "Connected; sending image and audio" });
  });
  await server.listen();
  const invite = b4a.toString(
    b4a.from(
      JSON.stringify({ bootstrap, key: b4a.toString(server.publicKey, "hex") }),
    ),
    "base64",
  );
  emit({ status: "Ready for a peer on the same Wi-Fi", invite, address });
}
async function join(invite) {
  const parsed = JSON.parse(b4a.toString(b4a.from(invite, "base64")));
  const n = new DHT({ bootstrap: parsed.bootstrap, host: "0.0.0.0" });
  nodes.push(n);
  await n.fullyBootstrapped();
  const s = n.connect(b4a.from(parsed.key, "hex"));
  bind(s, true);
  emit({ status: "Connecting to learner" });
}
IPC.on("data", (data) => {
  control += b4a.toString(data);
  let index;
  while ((index = control.indexOf("\n")) >= 0) {
    const raw = control.slice(0, index);
    control = control.slice(index + 1);
    Promise.resolve()
      .then(async () => {
        const c = JSON.parse(raw);
        if (c.action === "return") {
          if (!peer) throw Error("No connection");
          peer.write(b4a.from(JSON.stringify(endorsement) + "\n"));
          emit({ status: "Signed test endorsement returned" });
          return;
        }
        if (started) return;
        started = true;
        if (c.action === "host") await host();
        else if (c.action === "join") await join(c.invite);
      })
      .catch((e) => emit({ error: e.message }));
  }
});
emit({ status: "Bare transport ready" });
