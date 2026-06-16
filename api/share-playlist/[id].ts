import { getSharedPlaylist } from "../../src/server/handlers";

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { id } = req.query;
    const shareId = typeof id === "string" ? id : "";
    
    const result = await getSharedPlaylist(shareId);
    res.status(200).json(result);
  } catch (err: any) {
    console.error("Vercel Serverless Get Share Error:", err);
    res.status(404).json({ error: err.message || "Không tìm thấy chuỗi luyện tập này." });
  }
}
