
export class SignUpCommand {
  /**
   * The username for the new account.
   * This is typically an email address or user handle.
   *
   * @returns The username credential
   */
  get username(): string {
    return this._username;
  }


  set username(value: string) {
    this._username = value;
  }


  get password(): string {
    return this._password;
  }


  set password(value: string) {
    this._password = value;
  }

  get role ():string{
    return this._role;
  }

  set role(value:string){
    this._role = value;
  }

  private _username: string;


  private _password: string;

  private _role: string;


  constructor(props: { username: string; password: string; role: string }) {
    this._username = props.username;
    this._password = props.password;
    this._role = props.role;
  }
}
