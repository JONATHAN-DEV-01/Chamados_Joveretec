# ---------- Build ----------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src src
RUN ./mvnw -B -q package -DskipTests

# ---------- Runtime ----------
FROM eclipse-temurin:21-jre
WORKDIR /deployments

RUN useradd --system --uid 1001 quarkus
COPY --from=build --chown=1001 /app/target/quarkus-app/lib/ lib/
COPY --from=build --chown=1001 /app/target/quarkus-app/*.jar ./
COPY --from=build --chown=1001 /app/target/quarkus-app/app/ app/
COPY --from=build --chown=1001 /app/target/quarkus-app/quarkus/ quarkus/
USER 1001

# O Render injeta PORT; a aplicação lê via quarkus.http.port=${PORT:8080}
ENV PORT=8080 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
EXPOSE 8080

CMD ["sh", "-c", "exec java $JAVA_OPTS -jar quarkus-run.jar"]
