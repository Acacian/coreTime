import { Injectable } from '@nestjs/common';
import { returnCode } from '../common/returnCode';

@Injectable()
export class RunService {
  securityCheck(data) {
    // 모듈 제한
    const blockedModules = [
      'os',
      'sys',
      'shutil',
      'subprocess',
      'threading',
      'multiprocessing',
    ];
    const blockModulesPattern = [
      new RegExp(
        `(?!["'])import\\s+(${blockedModules.join('|')})\\s*(?!["'])`,
        'g',
      ),
      new RegExp(`from\\s+(${blockedModules.join('|')})\\s*`, 'g'),
    ];

    // 사용자 함수 사용 제한
    const blockedFunctions = ['input', 'open'];
    const inputPattern = [
      new RegExp(`\(${blockedFunctions.join('|')}) *\\(`, 'g'),
      new RegExp(`(\\w+) *= *(${blockedFunctions.join('|')}) *`, 'g'),
    ];

    // check
    for (const pattern of [...blockModulesPattern, ...inputPattern]) {
      if (pattern.test(data)) return returnCode['vulnerable'];
    }

    return returnCode['safe'];
  }
}
