#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraLiveActivity, NSObject)

RCT_EXTERN_METHOD(startWatching:(NSString *)postId
                  title:(NSString *)title
                  subreddit:(NSString *)subreddit
                  author:(NSString *)author
                  commentCount:(NSInteger)commentCount
                  upvotes:(NSInteger)upvotes
                  url:(NSString *)url
                  thumbnailURL:(NSString *)thumbnailURL
                  postText:(NSString *)postText
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateWatching:(NSString *)activityId
                  commentCount:(NSInteger)commentCount
                  upvotes:(NSInteger)upvotes
                  lastReplyAuthor:(NSString *)lastReplyAuthor
                  lastReplyPreview:(NSString *)lastReplyPreview
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopWatching:(NSString *)activityId
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
