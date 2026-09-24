// Runs the SAME mobile backend source with a Node IPC adapter; not a Bare/mobile test.
const { fork } = require("node:child_process");
const fs = require("node:fs");
if (process.argv[2] === "child") {
  const { EventEmitter } = require("node:events");
  const ipc = new EventEmitter();
  ipc.write = (b) => {
    for (const s of b.toString().trim().split("\n"))
      process.send(JSON.parse(s));
  };
  process.on("message", (m) =>
    ipc.emit("data", Buffer.from(JSON.stringify(m) + "\n")),
  );
  const customRequire = (id) => require(id === "bare-os" ? "node:os" : id);
  new Function("require", "BareKit", fs.readFileSync("backend.cjs", "utf8"))(
    customRequire,
    { IPC: ipc },
  );
} else {
  const host = fork(__filename, ["child"]),
    guest = fork(__filename, ["child"]);
  let completed = false;
  const timer = setTimeout(() => finish(false, "timeout"), 20000);
  function finish(ok, reason) {
    if (completed) return;
    completed = true;
    clearTimeout(timer);
    host.kill();
    guest.kill();
    console.log(
      JSON.stringify({
        ok,
        reason,
        scope:
          "same mobile backend in two Node processes on this Mac, using LAN addresses; not Bare runtime or phones",
      }),
    );
    process.exitCode = ok ? 0 : 1;
  }
  host.on("message", (m) => {
    if (m.error) return finish(false, m.error);
    console.log("host:", m.status);
    if (m.status === "Bare transport ready") host.send({ action: "host" });
    if (m.invite) guest.send({ action: "join", invite: m.invite });
    if (m.complete)
      finish(true, "evidence received and endorsement fixture returned");
  });
  guest.on("message", (m) => {
    if (m.error) return finish(false, m.error);
    console.log("guest:", m.status);
    if (m.files) {
      console.log(
        "files:",
        m.files.map((f) => f.name),
      );
      guest.send({ action: "return" });
    }
  });
}
