const { createApp } = require("./server/createApp");
const { loadStore } = require("./server/db/storeRepository");
const { replaceStore } = require("./server/mockStore");

const app = createApp();
const port = process.env.PORT || 3000;

const start = async () => {
  const store = await loadStore();

  if (!store.users.length) {
    console.warn(
      "PostgreSQL database has no seed data. Run `npm run db:seed` before using the app.",
    );
  }

  replaceStore(store);

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
};

if (require.main === module) {
  start().catch((error) => {
    console.error("Failed to start server.");
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { app, start };
