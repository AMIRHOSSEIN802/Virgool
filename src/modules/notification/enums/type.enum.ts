/** MVP notification types — only events that actually exist in this app. */
export enum NotificationType {
  Follow = 'follow',
  Like = 'like',
  Comment = 'comment',
  Reply = 'reply',
  CommentAccepted = 'comment_accepted',
  CommentRejected = 'comment_rejected',
}
