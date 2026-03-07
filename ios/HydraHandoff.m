#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraHandoff, NSObject)

RCT_EXTERN_METHOD(setActivity:(NSString *)activityType
                  title:(NSString *)title
                  webURL:(NSString *)webURL
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearActivity:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
