import express from "express";
import strategyRoutes from "./routes/strategyRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
app.use(express.json());

// Routes
app.use("/api/v1/strategy", strategyRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});