// Tests run in Node, where auth connects straight to the test database instead of Hyperdrive.
export const env = {
  HYPERDRIVE: {
    get connectionString() {
      return process.env.TEST_DATABASE_URL;
    },
  },
};
