package kpring.auth.api.v1

import kpring.auth.service.TokenService
import kpring.core.auth.dto.request.CreateTokenRequest
import kpring.core.auth.dto.request.TokenValidationRequest
import kpring.core.auth.dto.response.TokenValidationResponse
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1")
class AuthController(
    private val tokenService: TokenService,
) {

    @PostMapping("/token")
    suspend fun createToken(@Validated @RequestBody request: CreateTokenRequest): ResponseEntity<*> {
        val tokenInfo = tokenService.createToken(request)
        return ResponseEntity.ok()
            .header("Authorization", "Bearer ${tokenInfo.accessToken}")
            .body(tokenInfo)
    }

    @DeleteMapping("/token/{tokenData}")
    suspend fun expireToken(@PathVariable("tokenData") token: String): ResponseEntity<Any> {
        tokenService.expireToken(token)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/access_token")
    suspend fun recreateAccessToken(@RequestHeader("Authorization") refreshToken: String): ResponseEntity<*> {
        val response = tokenService.reCreateAccessToken(refreshToken.removePrefix("Bearer "))
        return ResponseEntity.ok()
            .header("Authorization", "Bearer ${response.accessToken}")
            .body(response)
    }

    @PostMapping("/validation")
    suspend fun validateToken(
        @RequestHeader("Authorization") token: String,
        @Validated @RequestBody request: TokenValidationRequest,
    ): ResponseEntity<TokenValidationResponse> {
        val response = tokenService.checkToken(token.removePrefix("Bearer "), request)
        return ResponseEntity.ok()
            .body(response)
    }
}