#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraICloudKV, NSObject)

RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(getString:(NSString *)key)

RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(getAllKeys)

RCT_EXTERN_METHOD(set:(NSString *)key value:(NSString *)value)

RCT_EXTERN_METHOD(remove:(NSString *)key)

@end
