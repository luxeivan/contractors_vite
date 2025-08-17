import React from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocs() {
  return (
    <div style={{ height: "100vh" }}>
      <SwaggerUI
        url="https://your-strapi-domain.com/documentation/v1/swagger.json"
        docExpansion="list"
        persistAuthorization={true}
        displayRequestDuration={true}
      />
    </div>
  );
}
