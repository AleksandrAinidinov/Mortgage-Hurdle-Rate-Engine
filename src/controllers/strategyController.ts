import { Request, Response } from "express";

// export const analyzeStrategy = (req: Request, res: Response) => {
//   res.json({
//     message: "Strategy endpoint hit"
//   });
// };

export const analyzeStrategy = (req: Request, res: Response) => {
  res.json({
    costOfWaiting: 0,
    hurdleRate: 0,
    recommendation: "WAIT"
  });
};