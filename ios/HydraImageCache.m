#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraImageCache, NSObject)

RCT_EXTERN_METHOD(cacheImage:(NSString *)urlString
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cacheImages:(NSArray<NSString *> *)urlStrings
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getCachedPath:(NSString *)urlString
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cleanup:(NSInteger)keepCount
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
