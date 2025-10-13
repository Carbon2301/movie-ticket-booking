export interface AccessTokenPayloadCreate {
  userId: number
  roleId: number
  roleName: string
}

// lưu userid,roleid,rolename vào accessToken
export interface AccessTokenPayload extends AccessTokenPayloadCreate {
  exp: number // thoi điểm hết hạn
  iat: number // thời điểm khởi tạo
}

export interface RefreshTokenPayloadCreate {
  userId: number
}

//refreshtoken chỉ lưu userid
export interface RefreshTokenPayload extends RefreshTokenPayloadCreate {
  exp: number
  iat: number
}