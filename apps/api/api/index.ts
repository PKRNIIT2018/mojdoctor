export default async function handler(_req: any, res: any) {
  res.statusCode = 200;
  res.setHeader("content-type", "text/plain");
  res.end("Hello from Vercel!");
}
