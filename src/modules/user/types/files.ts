import { MulterFile } from "src/common/utils/multer.utils";

export type ProfileImages = {
  image_profile: MulterFile[];
  bg_image: MulterFile[];
};
