using AutoMapper;
using EmployeeService.DTOs.Employee;
using EmployeeService.Models;

namespace EmployeeService.Mappings;

public class AddressProfile : Profile
{
    public AddressProfile()
    {
        CreateMap<Address, AddressDto>();

        CreateMap<AddressUpsertDto, Address>()
            .ForMember(d => d.Id, o => o.Ignore())
            .ForMember(d => d.CreatedAt, o => o.Ignore())
            .ForMember(d => d.UpdatedAt, o => o.Ignore())
            .ForMember(d => d.EmployeeId, o => o.Ignore())
            .ForMember(d => d.Employee, o => o.Ignore())
            .ForMember(d => d.City, o => o.MapFrom(s => s.City.Trim()))
            .ForMember(d => d.District, o => o.MapFrom(s => s.District.Trim()))
            .ForMember(d => d.PostalCode, o => o.MapFrom(s =>
                string.IsNullOrWhiteSpace(s.PostalCode) ? null : s.PostalCode.Trim()))
            .ForMember(d => d.FullAddress, o => o.MapFrom(s => s.FullAddress.Trim()))
            .ForMember(d => d.Country, o => o.MapFrom(s => s.Country.Trim()));
    }
}
