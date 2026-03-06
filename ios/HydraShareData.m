#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraShareData, NSObject)

RCT_EXTERN_METHOD(getSharedContent:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearSharedContent:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
