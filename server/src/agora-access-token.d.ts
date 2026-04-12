declare module 'agora-access-token' {
  export enum RtmRole {
    Rtm_User = 1,
  }
  export class RtmTokenBuilder {
    static buildToken(
      appId: string,
      appCertificate: string,
      account: string,
      role: RtmRole,
      privilegeExpiredTs: number,
    ): string;
  }

  export enum RtcRole {
    PUBLISHER = 1,
    SUBSCRIBER = 2,
  }
  export class RtcTokenBuilder {
    static buildTokenWithUid(
      appId: string,
      appCertificate: string,
      channelName: string,
      uid: number,
      role: RtcRole,
      privilegeExpiredTs: number,
    ): string;
    static buildTokenWithAccount(
      appId: string,
      appCertificate: string,
      channelName: string,
      account: string,
      role: RtcRole,
      privilegeExpiredTs: number,
    ): string;
  }
}
