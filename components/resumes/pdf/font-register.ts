import path from "path"
import { Font } from "@react-pdf/renderer"

const fontsDir = path.join(process.cwd(), "public", "fonts")

Font.register({
  family: "Pretendard",
  fonts: [
    { src: path.join(fontsDir, "Pretendard-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontsDir, "Pretendard-Bold.ttf"), fontWeight: 700 },
  ],
})
