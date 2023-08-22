import express from 'express'

const app = express();

app.use((req, res, next) => {
  if (req.path.endsWith('.importmap')) {
    res.setHeader('content-type', 'application/importmap+json');
  }

  next();
})
app.use(express.static('.'))

app.listen(8080, () => {
  console.log("Test server listening on port 8080");
})