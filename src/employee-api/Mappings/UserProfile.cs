using AutoMapper;
using EmployeeService.DTOs.Users;
using EmployeeService.Models;

namespace EmployeeService.Mappings;

public class UserProfile : Profile
{
    public UserProfile()
    {
        // Also used with ProjectTo: keep the member expressions translatable by EF Core.
        CreateMap<User, UserDto>()
            .ForMember(d => d.FirstName,
                o => o.MapFrom(s => s.Employee != null ? s.Employee.FirstName : string.Empty))
            .ForMember(d => d.LastName,
                o => o.MapFrom(s => s.Employee != null ? s.Employee.LastName : string.Empty))
            .ForMember(d => d.Email,
                o => o.MapFrom(s => s.Employee != null ? s.Employee.Email : s.Email))
            .ForMember(d => d.EmployeeNumber,
                o => o.MapFrom(s => s.Employee != null ? s.Employee.EmployeeNumber : null))
            .ForMember(d => d.Roles,
                o => o.MapFrom(s => s.UserRoles.Select(ur => ur.Role.Name)));
    }
}
