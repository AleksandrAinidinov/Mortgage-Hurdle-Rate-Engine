import express from "express";
import strategyRoutes from "./routes/strategyRoutes";

const app = express();
app.use(express.json());

app.use("/api/v1/strategy", strategyRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});