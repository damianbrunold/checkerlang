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
namespace CheckerLang
{
    public class ValueControlBreak : Value
    {
        public readonly SourcePos pos;
        
        public ValueControlBreak(SourcePos pos)
        {
            this.pos = pos;
        }

        public override bool IsEquals(Value value)
        {
            return this == value;
        }

        public override int CompareTo(Value value)
        {
            return string.CompareOrdinal(ToString(), value.ToString());
        }

        public override int HashCode()
        {
            return 0;
        }

        public override string Type()
        {
            return "break";
        }

        public override bool IsBreak()
        {
            return true;
        }

        public override ValueControlBreak AsBreak()
        {
            return this;
        }

        public override string ToString()
        {
            return "break";
        }

    }
}