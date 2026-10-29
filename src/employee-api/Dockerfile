FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY src/employee-api/EmployeeService.csproj src/employee-api/
RUN dotnet restore src/employee-api/EmployeeService.csproj

COPY src/employee-api/ src/employee-api/
RUN dotnet publish src/employee-api/EmployeeService.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5001
EXPOSE 5001

ENTRYPOINT ["dotnet", "EmployeeService.dll"]
