package kpring.core.chat.chat.dto.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull

data class CreateChatRequest(
  @field:NotNull
  val id: String,
  @field:NotNull
  val type: ChatType,
  @field:NotBlank
  val content: String,
)
