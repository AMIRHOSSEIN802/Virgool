export enum BadRequestMessage {
  InvalidLoginDate = 'اطلاعات ارسال شده برای ورود صحیح نمی باشد',
  InValidReqisterDate = 'اطلاعات ارسال شده برای ثبت نام صحیح نمی باشد',
}
export enum AuthMessage {
  NotFoundAccount = 'حساب کاربری یافت نشد',
  AlreadyExistAccount = 'حساب کاربری با این مشخصات قبلا وجود دارد',
}
export enum PublicMessage {
  SendOtp = 'کد ارسال شد',
}

export enum ValidationMessage {}
