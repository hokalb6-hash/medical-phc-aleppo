import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const eagle = await readFile(join(process.cwd(), "public", "aleppo-eagle.png"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1c1c",
        }}
      >
        <img
          src={`data:image/png;base64,${eagle.toString("base64")}`}
          width={150}
          height={150}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
