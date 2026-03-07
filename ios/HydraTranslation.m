#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraTranslation, NSObject)

RCT_EXTERN_METHOD(detectLanguage:(NSString *)text
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(translate:(NSString *)text
                  sourceLanguage:(NSString *)sourceLanguage
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
