import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
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
          width={26}
          height={26}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
