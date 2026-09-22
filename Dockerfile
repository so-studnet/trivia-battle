FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY . .

RUN javac backend/*.java

CMD ["java", "-cp", "backend", "Server"]