using AutoMapper;
using EmployeeService.DTOs.Roles;
using EmployeeService.Models;

namespace EmployeeService.Mappings;

public class RoleProfile : Profile
{
    public RoleProfile()
    {
        CreateMap<Role, RoleDto>()
            .ForMember(d => d.UserCount, o => o.MapFrom(s => s.UserRoles.Count))
            .ForMember(d => d.Description, o => o.Ignore())
            .ForMember(d => d.Permissions, o => o.Ignore());
    }
}
