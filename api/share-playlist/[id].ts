import { getSharedPlaylist } from "../../src/server/handlers";
import { applySecurityHeaders } from "../../src/server/httpSecurity";

export default async function handler(req: any, res: any) {
  applySecurityHeaders(req, res, "GET,OPTIONS");

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
