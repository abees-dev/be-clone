const {
  AuthenticationService,
  JWTStrategy,
} = require("@feathersjs/authentication");
const { LocalStrategy } = require("@feathersjs/authentication-local");
const { expressOauth } = require("@feathersjs/authentication-oauth");
const decode = require("jwt-decode");

class MyAuthenticationService extends AuthenticationService {
  async getPayload(authResults, params) {
    const basePayload = await super.getPayload(authResults, params);
    return {
      ...basePayload,
      isAdmin: authResults?.user?.isAdmin,
    };
  }
}

class MyJWTStrategy extends JWTStrategy {
  setup(app) {
    this.app = app;
  }
  async authenticate(data, params) {
    const auth = new MyAuthenticationService(this.app);
    const payload = decode(data.accessToken);
    const time = new Date();
    const now = time.getTime();
    let accessToken = data?.accessToken;
    if (payload.exp * 1000 <= now) {
      const cookieInfo = params.headers?.cookie;
      const cookieTokenKey = "refreshToken=";
      const refreshToken = cookieInfo?.substring(
        cookieInfo?.indexOf(cookieTokenKey) + cookieTokenKey?.length
      );
      const refreshVerify = await auth.verifyAccessToken(
        refreshToken,
        {
          expiresIn: "1y",
        },
        process.env.SECRET_REFRESH_TOKEN
      );
      const existRefreshToken = await this.app
        .service("refresh-token")
        .find({ refreshToken, userId: payload?.sub });
      if (refreshVerify?.sub && existRefreshToken?.data[0] !== undefined) {
        accessToken = await auth.createAccessToken({
          sub: payload.sub,
          isAdmin: payload.isAdmin,
        });
      }
    }
    const authResults = await super.authenticate(
      {
        ...data,
        accessToken,
      },
      params
    );
    return authResults;
  }
}
module.exports = (app) => {
  const authentication = new MyAuthenticationService(app);

  authentication.register("jwt", new MyJWTStrategy());
  authentication.register("local", new LocalStrategy());

  app.use("/authentication", authentication);
  app.configure(expressOauth());
};
