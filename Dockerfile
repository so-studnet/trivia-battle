FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY . .

RUN javac backend/Server.java

CMD ["java", "-cp", "backend", "Server"]