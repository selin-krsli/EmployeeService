using Microsoft.IdentityModel.JsonWebTokens;

namespace EmployeeService.Auth;
public static class AppClaimTypes
{
    public const string UserId = JwtRegisteredClaimNames.Sub;

    public const string UserName = JwtRegisteredClaimNames.UniqueName;

    public const string Email = JwtRegisteredClaimNames.Email;

    public const string Name = JwtRegisteredClaimNames.Name;

    public const string Role = "role";

    public const string Permission = "permission";
}
