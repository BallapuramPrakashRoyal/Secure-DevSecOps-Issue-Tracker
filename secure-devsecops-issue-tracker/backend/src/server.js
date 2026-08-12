const app = require('./app');
const { PORT } = require('./lib/env');

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Issue tracker API listening on port ${PORT}`);
});
