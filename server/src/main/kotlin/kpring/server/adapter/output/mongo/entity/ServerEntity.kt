package kpring.server.adapter.output.mongo.entity

import jakarta.persistence.Entity
import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document

@Entity
@Document(collection = "server")
class ServerEntity(
  var name: String,
  var users: MutableList<ServerUserEntity> = mutableListOf()
) {
  @Id
  lateinit var id: String
}