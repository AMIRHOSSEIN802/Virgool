export enum BadRequestMessage {
  InvalidLoginDate = 'اطلاعات ارسال شده برای ورود صحیح نمی باشد',
  InValidReqisterDate = 'اطلاعات ارسال شده برای ثبت نام صحیح نمی باشد',
  SomthingWrong = 'خطایی پیش امده مجددا تلاش کنید',
  invalidCategorise = 'دسته بندی عا را به درستی وارد کنید ',
  AlreadyAccepted = 'کامنت شما قبلا تایید شده است',
  AlreadyRejected = 'کامنت شما قبلا رد شده است',
  cannotfollow = 'نمیتونید خودتون را دنبال کنید',
}
export enum AuthMessage {
  NotFoundAccount = 'حساب کاربری یافت نشد',
  TryAgain = 'دوباره تلاش کنید',
  AlreadyExistAccount = 'حساب کاربری با این مشخصات قبلا وجود دارد',
  ExiredCode = 'کد تایید منقضی شده مجددا تلاش کنید',
  LoginAgin = 'مجددا وارد حساب کاربری خود شوید',
  LoginIsRequired = 'وارد حساب کاربری خود شوید',
  Blocked = 'حساب کاربری شما مسدود می باشد، لطفا با پشتیبانی در ارتباط باشید ',
}
export enum PublicMessage {
  SendOtp = 'کد با موفقیت ارسال شد',
  LoggedIn = 'با موفقیت واررد حساب کاربری خود شدید',
  Created = 'با موفقیت ایجاد شد',
  Deleted = 'با موفقیت خذف شد',
  Updated = 'با موفقیت بروز رسانی شد',
  Inserted = 'با موفقیت درج شد',
  Liek = 'مقاله با موفقیت لایک شد',
  DisLike = 'لایک شما از مقاله برداشته شد',
  bokkmark = 'مقاله با موفقیت ذخیره شد',
  Unbookmark = 'مقاله از لیست ذخیره شده برداشته شده',
  CreatedComment = 'کامنت شما با موفقیت ارسال شد',
  Followed = 'با موفقیت دنبال شد',
  UnFollow = 'از لیست دنبال شوندگان حذف شد',
  Blocked = 'حساب کاربری با موفقیت مسدود شد',
  UnBlocked = 'حساب کاربری از حالت مسدود خارج شد',
}

export enum NotFoundMessage {
  NotFound = 'موردی یافت نشد',
  NotFoundCategory = 'دسته بندی یافت نشد',
  NotFoundPost = 'مقاله ای  یافت نشد',
  NotFoundUser = 'کاربری یافت نشد',
}

export enum ConflictMessage {
  CategoryTitle = 'عنوان وارد شده صحیح نمی باشد',
  Email = 'ایمیل اشتباه است',
  Phone = 'شماره موبایل اشتباه است',
  username = 'نام کاربری اشتباه است',
}
export enum ValidationMessage {
  InvalidImageFormat = 'فرمت تصویر انتخاب شده باید از نوع jpg , png باشد',
  InvalidEmailFormat = 'ایمیل وارد شده صحیح نمی باشد',
  InvalidPhoneFormat = 'شماره موبایل وارد شده صحیح نمی باشد',
}
