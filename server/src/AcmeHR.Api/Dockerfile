# Build context is the `server/` directory (see docker-compose.yml).
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY src/AcmeHR.Domain/AcmeHR.Domain.csproj src/AcmeHR.Domain/
COPY src/AcmeHR.Application/AcmeHR.Application.csproj src/AcmeHR.Application/
COPY src/AcmeHR.Infrastructure/AcmeHR.Infrastructure.csproj src/AcmeHR.Infrastructure/
COPY src/AcmeHR.Api/AcmeHR.Api.csproj src/AcmeHR.Api/
RUN dotnet restore src/AcmeHR.Api/AcmeHR.Api.csproj

COPY src/ src/
RUN dotnet publish src/AcmeHR.Api/AcmeHR.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "AcmeHR.Api.dll"]
