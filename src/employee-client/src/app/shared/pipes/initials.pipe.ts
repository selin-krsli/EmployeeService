import { Pipe, PipeTransform } from '@angular/core';

/** `{ firstName: 'Ayşe', lastName: 'Yılmaz' } | initials` → `AY` */
@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(person: { firstName: string; lastName: string; userName?: string }): string {
    const letters = `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.trim();
    const source = letters || person.userName?.charAt(0) || '?';
    return source.toLocaleUpperCase('tr-TR');
  }
}
