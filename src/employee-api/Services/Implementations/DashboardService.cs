using AutoMapper;
using AutoMapper.QueryableExtensions;
using EmployeeService.Data;
using EmployeeService.DTOs.Dashboard;
using EmployeeService.DTOs.Employee;
using EmployeeService.Services.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace EmployeeService.Services.Implementations;

public class DashboardService : IDashboardService
{
    private const int RecentEmployeeCount = 5;

    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public DashboardService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<DashboardDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var nextMonthStart = monthStart.AddMonths(1);

        var totalEmployees = await _context.Employees.CountAsync(cancellationToken);
        var activeEmployees = await _context.Employees.CountAsync(e => e.IsActive, cancellationToken);
        var totalDepartments = await _context.Departments.CountAsync(cancellationToken);
        var hiredThisMonth = await _context.Employees.CountAsync(
            e => e.HireDate >= monthStart && e.HireDate < nextMonthStart,
            cancellationToken);

        var departmentRows = await _context.Departments
            .AsNoTracking()
            .Select(d => new
            {
                d.Id,
                d.Name,
                Count = d.Employees.Count
            })
            .OrderByDescending(d => d.Count)
            .ThenBy(d => d.Name)
            .ToListAsync(cancellationToken);

        var departmentForPieChart = departmentRows
            .Select(d => new DepartmentForPieChartDto
            {
                Id = d.Id,
                Name = d.Name,
                Count = d.Count,
                Percent = totalEmployees > 0 ? (int)Math.Round(d.Count * 100.0 / totalEmployees) : 0
            })
            .ToList();

        var recentEmployees = await _context.Employees
            .AsNoTracking()
            .Where(e => e.IsActive)
            .OrderByDescending(e => e.CreatedAt)
            .Take(RecentEmployeeCount)
            .ProjectTo<EmployeeListDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new DashboardDto
        {
            TotalEmployees = totalEmployees,
            ActiveEmployees = activeEmployees,
            PassiveEmployees = totalEmployees - activeEmployees,
            TotalDepartments = totalDepartments,
            HiredThisMonth = hiredThisMonth,
            DepartmentForPieChart = departmentForPieChart,
            RecentEmployees = recentEmployees
        };
    }
}
