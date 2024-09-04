import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { waypoints, departureTime } = req.body;

  const apiKey = process.env.GOOGLE_API_KEY;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${waypoints.join(
    "|"
  )}&destinations=${waypoints.join(
    "|"
  )}&departure_time=${departureTime}&traffic_model=best_guess&key=${apiKey}`;

 
    const response = await fetch(url);

    const data = await response.json();
    res.status(200).json(data);
}
//
