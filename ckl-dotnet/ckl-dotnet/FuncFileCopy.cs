/*  Copyright (c) 2021 Damian Brunold, Gesundheitsdirektion Kanton Zürich

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace CheckerLang
{
    public class FuncFileCopy : FuncBase
    {
        public FuncFileCopy() : base("file_copy")
        {
            info = "file_copy(src, dest)\r\n" +
                   "\r\n" +
                   "Copies the specified file.\r\n";
        }
        
        public override List<string> GetArgNames()
        {
            return new List<string> {"src", "dest"};
        }
        
        public override Value Execute(Args args, Environment environment, SourcePos pos)
        {
            var src = args.GetString("src").GetValue();
            var dest = args.GetString("dest").GetValue();
            try
            {
                File.Copy(src, dest, true);
            }
            catch 
            {
                throw new ControlErrorException(new ValueString("ERROR"),"Cannot copy " + src + " to " + dest, pos);
            }
            return ValueNull.NULL;
        }
    }
    
}