import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { toast, Toaster } from "react-hot-toast";

const OauthGoogleCallback = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const accessToken = searchParams.get("accessToken")
    const refreshToken = searchParams.get("refreshToken")
    const userStr = searchParams.get("user") // string
    let user = null

    if (userStr) {
      try {
        user = JSON.parse(userStr) //parse về object
        localStorage.setItem("user", JSON.stringify(user))
      } catch (e) {
        console.error("User parse error:", e)
      }
    }

    if (accessToken && refreshToken) {
      localStorage.setItem("accessToken", accessToken)
      localStorage.setItem("refreshToken", refreshToken)

      toast.success("Đăng nhập Google thành công!")

      // redirect về trang chủ cho tất cả user
      setTimeout(() => {
        navigate("/", { replace: true })
      }, 1000) 
    } else {
      const errorMessage = searchParams.get("errorMessage")
      setError(errorMessage ?? "Something went wrong with Google authentication")
    }
  }, [location, navigate])

  return (
    <div>
      {error && <div className="error" style={{ color: "red" }}>{error}</div>}
    </div>
  )
}

export default OauthGoogleCallback
