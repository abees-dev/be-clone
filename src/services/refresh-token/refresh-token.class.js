const { Service } = require("feathers-mongoose");
const { AuthenticationService } = require("@feathersjs/authentication");
const { GeneralError } = require("@feathersjs/errors");
exports.RefreshToken = class RefreshToken extends Service {
  setup(app) {
    this.app = app;
  }

  async create(data, params) {
    try {
      const { isAdmin, _id } = data;
      const authService = new AuthenticationService(this.app);
      const signRefreshToken = async () => {
        return await authService.createAccessToken(
          {
            sub: _id,
            isAdmin,
          },
          {
            expiresIn: "1y",
          },
          process.env.SECRET_REFRESH_TOKEN
        );
      };
      const refreshToken = await signRefreshToken();
      params.refreshToken = refreshToken;
      return await super.create({ refreshToken, userId: _id }, params);
    } catch (error) {
      return new GeneralError(new Error(error || "Lỗi hệ thống!"));
    }
  }
  async remove(id, params) {
    const clientRefreshToken = params?.headers?.cookie?.split("=")[1] || "";
    const existRefreshToken = await this.Model.findOne({
      userId: params?.query?.userId,
      refreshToken: clientRefreshToken,
    });
    return await super.remove(existRefreshToken?._id, params);
  }
};