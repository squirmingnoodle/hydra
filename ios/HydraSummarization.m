#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraSummarization, NSObject)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(summarizePost:(NSString *)title
                  subreddit:(NSString *)subreddit
                  author:(NSString *)author
                  text:(NSString *)text
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(summarizeComments:(NSString *)title
                  author:(NSString *)author
                  postSummary:(NSString *)postSummary
                  comments:(NSArray *)comments
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
